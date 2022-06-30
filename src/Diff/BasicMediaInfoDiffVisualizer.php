<?php

namespace Wikibase\MediaInfo\Diff;

use Diff\DiffOp\Diff\Diff;
use Diff\DiffOp\DiffOp;
use Diff\DiffOp\DiffOpAdd;
use Diff\DiffOp\DiffOpChange;
use Diff\DiffOp\DiffOpRemove;
use MessageLocalizer;
use MWException;
use Wikibase\DataModel\Services\Diff\EntityDiff;
use Wikibase\Repo\Content\EntityContentDiff;
use Wikibase\Repo\Diff\BasicDiffView;
use Wikibase\Repo\Diff\ClaimDiffer;
use Wikibase\Repo\Diff\ClaimDifferenceVisualizer;
use Wikibase\Repo\Diff\EntityDiffVisualizer;

/**
 * Class for generating basic diff views of mediainfo entities
 *
 * @license GPL-2.0-or-later
 * @author Addshore
 */
class BasicMediaInfoDiffVisualizer implements EntityDiffVisualizer {

	/**
	 * @var MessageLocalizer
	 */
	private $messageLocalizer;

	/**
	 * @var ClaimDiffer|null
	 */
	private $claimDiffer;

	/**
	 * @var ClaimDifferenceVisualizer|null
	 */
	private $claimDiffVisualizer;

	public function __construct(
		MessageLocalizer $messageLocalizer,
		ClaimDiffer $claimDiffer,
		ClaimDifferenceVisualizer $claimDiffView
	) {
		$this->messageLocalizer = $messageLocalizer;
		$this->claimDiffer = $claimDiffer;
		$this->claimDiffVisualizer = $claimDiffView;
	}

	/**
	 * Generates and returns an HTML visualization of the provided EntityContentDiff.
	 *
	 * @param EntityContentDiff $diff
	 *
	 * @return string
	 * @throws MWException
	 */
	public function visualizeEntityContentDiff( EntityContentDiff $diff ) {
		return $this->visualizeEntityDiff( $diff->getEntityDiff() );
	}

	/**
	 * Generates and returns an HTML visualization of the provided EntityDiff.
	 *
	 * @param EntityDiff $diff
	 *
	 * @return string
	 * @throws MWException
	 */
	protected function visualizeEntityDiff( EntityDiff $diff ) {
		if ( $diff->isEmpty() ) {
			return '';
		}

		$html = '';

		$termDiffVisualizer = new BasicDiffView(
			[],
			new Diff(
				[
					$this->messageLocalizer->msg( 'wikibasemediainfo-diffview-label' )
						->text() => $diff->getLabelsDiff(),
				],
				true
			)
		);

		$html .= $termDiffVisualizer->getHtml();

		foreach ( $diff->getClaimsDiff() as $claimDiffOp ) {
			$html .= $this->getClaimDiffHtml( $claimDiffOp );
		}

		return $html;
	}

	/**
	 * @param DiffOp $claimDiffOp
	 *
	 * @return string HTML
	 * @throws MWException
	 */
	protected function getClaimDiffHtml( DiffOp $claimDiffOp ) {
		if ( $claimDiffOp instanceof DiffOpChange ) {
			$claimDifference = $this->claimDiffer->diffClaims(
				$claimDiffOp->getOldValue(),
				$claimDiffOp->getNewValue()
			);
			return $this->claimDiffVisualizer->visualizeClaimChange(
				$claimDifference,
				$claimDiffOp->getNewValue()
			);
		}

		if ( $claimDiffOp instanceof DiffOpAdd ) {
			return $this->claimDiffVisualizer->visualizeNewClaim( $claimDiffOp->getNewValue() );
		} elseif ( $claimDiffOp instanceof DiffOpRemove ) {
			return $this->claimDiffVisualizer->visualizeRemovedClaim( $claimDiffOp->getOldValue() );
		} else {
			throw new MWException( 'Encountered an unexpected diff operation type for a claim' );
		}
	}

}
